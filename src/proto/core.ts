import protoJs from "protobufjs";
import { isPrototype } from "../utils";
import {
  Interface,
  Enum,
  PropertySignature,
  ApiModule,
  InterfaceModule,
  DependencyType,
  PropertyType,
  Import,
} from "../apiInterface";

export function isEnum(obj) {
  return isPrototype(obj, protoJs.Enum);
}

export function isType(obj) {
  return isPrototype(obj, protoJs.Type);
}

export function isNamespace(obj) {
  return isPrototype(obj, protoJs.Namespace);
}

export function isService(obj) {
  return isPrototype(obj, protoJs.Service);
}

/**
 * Because protobuf.js has special treatment for some modules of google, it needs to be converted
 * // protobuf.js/src/common.js
 * @param typeStr
 * @returns
 */
function getGoogleCommon(typeStr): string {
  if (typeStr === "google.protobuf.Empty") {
    return "{}";
  }
  if (typeStr === "google.protobuf.Any") return `any`;
  return "";
}

export function typeGenInterfaceModule(child: protoJs.Type): InterfaceModule {
  const result: InterfaceModule = {
    name: child.name,
    comment: `This the module of ${child.name}`,
    enums: [],
    interfaces: [],
  };
  Object.keys(child.nested).forEach((key) => {
    const item = child.nested[key];
    if (isType(item)) {
      result.interfaces.push(typeGenInterface(item as any));
    }
    if (isEnum(item)) {
      result.enums.push(enumGenEnum(item as any));
    }
  });
  return result;
}

export function typeGenInterface(item: protoJs.Type): Interface {
  const result: Interface = {
    name: item.name,
    comment: item.comment,
    members: [],
  };

  for (let i = 0; i < item.fieldsArray.length; i++) {
    const field = item.fieldsArray[i];
    if (field.name.match(/\./)) {
      // Filter some strange data generated by protobuf.js itself
      continue;
    }
    // if (field.type.match(/xx/)) {
    //   debugger;
    // }

    const member: PropertySignature = {
      name: field.name,
      propertyType: {
        type: field.type,
        dependencyTypeName: "",
        dependencyType: DependencyType.SYSTEM,
        resolvedPath: "",
        // @ts-ignorets
        keyType: field.keyType,
        map: field.map,
      },
      comment: field.comment,

      repeated: field.repeated,
      optional: field.options ? field.options["proto3_optional"] : false,
      jsonName: field.options ? field.options["json_name"] : undefined,
      defaultValue: field.options ? field.options["default"] : undefined,
    };
    // If the reference is to another type
    if (field.resolvedType) {
      // member.type = field.resolvedType.name
      // if (field.type.match(/google/)) {
      //   debugger
      // }
      // member.type = field.type.match(/google/) ? field.resolvedType.name : '{}'
      // write reference path
      const type = getGoogleCommon(field.type) || field.resolvedType.name;
      const resolvedPath =
        field.filename === field.resolvedType.filename
          ? ""
          : field.resolvedType.filename;
      let dependencyType = DependencyType.SYSTEM;
      let dependencyTypeName = "";
      if (field.filename === field.resolvedType.filename) {
        if (field.resolvedType.parent.name === item.name) {
          dependencyType = DependencyType.INLINE;
        } else {
          dependencyType = DependencyType.CURRENT;
        }
      } else if (field.resolvedType.filename) {
        dependencyType = DependencyType.EXTERNAL;
        dependencyTypeName = field.type;
      }
      member.propertyType = {
        ...member.propertyType,
        type,
        resolvedPath,
        dependencyType,
        dependencyTypeName,
      };
    }
    result.members.push(member);
  }

  return result;
}
export function insertImport(arr: Import[], k: PropertyType) {
  const index = arr.findIndex((a) => k.resolvedPath === a.resolvedPath);
  if (index > -1) {
    // 如果import内已经有了该文件，但是type值还不存在的场合
    !arr[index].importClause.find((i) => i.type === k.type) &&
      arr[index].importClause.push({
        type: k.type,
        dependencyTypeName: k.dependencyTypeName,
      });
  } else {
    // 如果是一个全新的
    arr.push({
      importClause: [
        {
          type: k.type,
          dependencyTypeName: k.dependencyTypeName,
        },
      ],
      resolvedPath: k.resolvedPath,
    });
  }
}

export function enumGenEnum(item: protoJs.Enum): Enum {
  const result: Enum = {
    name: item.name,
    comment: item.comment,
    members: Object.keys(item.values).map((k) => ({
      name: k,
      // initializer: item.values[k],
      initializer: k,
      comment: item.comments[k],
    })),
  };
  return result;
}

const httpType = {
  "(google.api.http).get": "get",
  "(google.api.http).post": "post",
  "(google.api.http).put": "put",
  "(google.api.http).patch": "patch",
  "(google.api.http).delete": "delete",
};
const getHttpType = (options) => {
  const keys = Object.keys(options || {});
  for (let k of keys) {
    if (httpType[k]) {
      return {
        method: httpType[k],
        url: options[k],
      };
    }
  }

  return {
    method: "",
    url: "",
  };
};

function getApiFunctionPropertyType(k: protoJs.Method): {
  req: PropertyType;
  res: PropertyType;
} {
  const { resolvedRequestType: reqT, resolvedResponseType: resT } = k;
  const reqType = getGoogleCommon(k.requestType);
  const resType = getGoogleCommon(k.responseType);

  return {
    req: {
      type: reqType || (reqT ? reqT.name : k.requestType),
      dependencyType:
        k.filename === reqT.filename
          ? DependencyType.CURRENT
          : DependencyType.EXTERNAL,
      dependencyTypeName: k.requestType,
      resolvedPath: reqT ? reqT.filename : "",
    },
    res: {
      type: resType || (resT ? resT.name : k.responseType),
      dependencyType:
        k.filename === resT.filename
          ? DependencyType.CURRENT
          : DependencyType.EXTERNAL,
      dependencyTypeName: k.responseType,
      resolvedPath: resT ? resT.filename : "",
    },
  };
}

export function serviceGenApiFunction(item: protoJs.Service): ApiModule {
  const result: ApiModule = {
    comment: item.comment,
    name: item.name,
    functions: item.methodsArray.map((k) => {
      const httpType = getHttpType(k.options);

      let comment = k.comment || "";
      const redirectReg = comment.match(/\@redirect\s*(\S+)/);
      let redirectUrl = "";
      if (redirectReg && redirectReg.length) {
        redirectUrl = redirectReg[1];
        comment = comment.replace(
          /\@redirect\s*(\S+)/,
          "@originUrl: " + httpType.url
        );
      }
      const methodReg = comment.match(/\@method\s*(\S+)/);
      let commentMethod = "post";
      if (methodReg && methodReg.length) {
        commentMethod = methodReg[1];
      }
      const { req, res } = getApiFunctionPropertyType(k);
      return {
        name: k.name,
        comment,
        req,
        // reqResolvedPath: resFn === k.filename ? "" : resFn,
        url: httpType.url,
        redirectUrl,
        res,
        // resResolvedPath: repFn === k.filename ? "" : repFn,
        method: (httpType.method || commentMethod).toLowerCase(),
      };
    }),
  };
  return result;
}

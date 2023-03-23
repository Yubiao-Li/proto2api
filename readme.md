# 这是什么

这是一个用于拉取后台pb文件并转换成ts接口的文件，方便开发过程中与后台对协议

## 怎么用

> 所有pb文件都以submodule的形式放在src/proto，后续如果要新加submodule也要放这。因为后台是大仓，为了减少拉取pb的时间，用了sparecheckout的方式来管理submodule
1. 和后台确认pb文件名，然后`echo ${filepath} > .git/modules/${modulepath}/info/sparse-checkout`，这一步是告诉git什么文件要被拉取。（实在不知道怎么写可以参考`.git/modules/src/mmbiz/info/sparse-checkout`）

2. `npm run proto2api`，生成的ts文件在src/api。

## 我要添加新的仓库

参考[这个](https://stackoverflow.com/questions/45688121/how-to-do-submodule-sparse-checkout-with-git)添加仓库
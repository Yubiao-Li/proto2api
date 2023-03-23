const data = require('./test.json');
import { genApiFileCode } from '../src/genTsApi';

console.log(
  genApiFileCode(data, 'webapi', '', {
    ExposureComment: 1,
    ExposureCommentList: 1,
    GetAppMsgSegmentResp: 1,
    GetAppMsgCommentReplyBuffer: 1,
    AddCommentResp: 1,
    GetAppMsgCommentResp: 1,
    GetAppMsgCommentReplyResp: 1,
    AddCommentReplyResp: 1,
    GetCommentResp: 1,
    AppMsgCommentInfo: 1,
    Comment: 1,
    CommentReply: 1,
    CommentReplyList: 1,
    UserLikeInfo: 1,
    ModifyDetail: 1,
    'ModifyDetail.Item': 1,
    SegmentLikeStat: 1,
    UnderLineInfo: 1,
    ShareLineInfo: 1,
    SegmentItem: 1,
  })
);

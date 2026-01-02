export {
  XClient,
  getClient,
  type RateLimitInfo,
  type ClientOptions,
  type RequestOptions,
} from "./client.js";

export { getMe, getUserByUsername, getUserById } from "./users.js";

export {
  getTweet,
  createTweet,
  deleteTweet,
  replyToTweet,
  quoteTweet,
  getHomeTimeline,
  getUserTimeline,
  getMentions,
  searchTweets,
  type PaginationOptions,
} from "./posts.js";

export {
  likeTweet,
  unlikeTweet,
  retweet,
  unretweet,
  bookmarkTweet,
  removeBookmark,
  getBookmarks,
} from "./engagement.js";

export {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  blockUser,
  unblockUser,
  getBlocked,
  muteUser,
  unmuteUser,
  getMuted,
} from "./relationships.js";

export {
  getList,
  createList,
  updateList,
  deleteList,
  getListTimeline,
  getOwnedLists,
  getFollowedLists,
  getPinnedLists,
  getListMembers,
  addListMember,
  removeListMember,
  followList,
  unfollowList,
  pinList,
  unpinList,
} from "./lists.js";

export {
  listConversations,
  getConversationMessages,
  getMessagesWithUser,
  sendMessageToUser,
  sendMessageToConversation,
  createGroupDM,
  deleteDMEvent,
} from "./dm.js";

export {
  getSpace,
  getSpaces,
  searchSpaces,
  getSpacesByCreators,
  getSpaceBuyers,
} from "./spaces.js";

export {
  uploadMedia,
  simpleUpload,
  chunkedUpload,
  getMediaStatus,
  waitForProcessing,
  setMediaAltText,
} from "./media.js";

export {
  parseNaturalLanguage,
  summarize,
  analyze,
  draft,
  suggestReplies,
  ask,
  type AnalysisResult,
  type SummaryResult,
  type DraftResult,
  type ParsedCommand,
} from "./grok.js";

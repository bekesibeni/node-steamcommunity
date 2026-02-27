"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EFriendRelationship = void 0;
var EFriendRelationship;
(function (EFriendRelationship) {
    EFriendRelationship[EFriendRelationship["None"] = 0] = "None";
    EFriendRelationship[EFriendRelationship["Blocked"] = 1] = "Blocked";
    EFriendRelationship[EFriendRelationship["RequestRecipient"] = 2] = "RequestRecipient";
    EFriendRelationship[EFriendRelationship["Friend"] = 3] = "Friend";
    EFriendRelationship[EFriendRelationship["RequestInitiator"] = 4] = "RequestInitiator";
    EFriendRelationship[EFriendRelationship["Ignored"] = 5] = "Ignored";
    EFriendRelationship[EFriendRelationship["IgnoredFriend"] = 6] = "IgnoredFriend";
    /** @deprecated Was used by the original Facebook linking feature; now unused. */
    EFriendRelationship[EFriendRelationship["SuggestedFriend"] = 7] = "SuggestedFriend";
})(EFriendRelationship || (exports.EFriendRelationship = EFriendRelationship = {}));
//# sourceMappingURL=EFriendRelationship.js.map
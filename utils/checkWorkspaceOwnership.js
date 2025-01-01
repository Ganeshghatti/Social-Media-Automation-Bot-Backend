const WorkSpace = require("../models/WorkSpace");

async function checkWorkspaceOwnership(workspaceId, userId) {
  const workspace = await WorkSpace.findOne({
    _id: workspaceId,
    userId: userId
  });
  
  return workspace;
}

module.exports = checkWorkspaceOwnership; 
const validateRequestedAccounts = (workspace, post) => {
  const connectedAccounts = workspace.connectedAccounts.filter(
    account => account.type === post.type
  );
  
  if (!post.accountId) {
    throw new Error(`No account specified for ${post.type} post`);
  }

  const isConnected = connectedAccounts.some(
    account => account.credentials.userId === post.accountId
  );

  if (!isConnected) {
    throw new Error(`Account ${post.type}-${post.accountId} is not connected to this workspace`);
  }
  
  return true;
};

module.exports = validateRequestedAccounts; 
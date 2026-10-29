export function isCredentialActive(credential, now = Date.now()) {
  return Boolean(credential && !credential.revokedAt && new Date(credential.expiresAt).getTime() > now);
}

export function isOtpChallengeUsable(challenge, now = Date.now()) {
  return Boolean(challenge && !challenge.consumedAt && challenge.attemptCount < 5 && new Date(challenge.expiresAt).getTime() > now);
}

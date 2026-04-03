const env = require("../config/env");

function getCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: maxAgeMs,
    path: "/",
  };
}

function parseDurationToMs(duration) {
  const match = String(duration).match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitMap[unit];
}

// We keep auth cookie setup in one place so header-based and cookie-based auth stay consistent.
function setAuthCookies(response, tokens) {
  response.cookie(
    env.cookie.accessTokenName,
    tokens.accessToken,
    getCookieOptions(parseDurationToMs(env.jwtExpiresIn))
  );
  response.cookie(
    env.cookie.refreshTokenName,
    tokens.refreshToken,
    getCookieOptions(parseDurationToMs(env.refreshTokenExpiresIn))
  );
}

function clearAuthCookies(response) {
  response.clearCookie(env.cookie.accessTokenName, getCookieOptions(0));
  response.clearCookie(env.cookie.refreshTokenName, getCookieOptions(0));
}

function getAccessTokenFromRequest(request) {
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return request.cookies?.[env.cookie.accessTokenName] || null;
}

function getRefreshTokenFromRequest(request) {
  return (
    request.body?.refreshToken ||
    request.cookies?.[env.cookie.refreshTokenName] ||
    null
  );
}

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
};

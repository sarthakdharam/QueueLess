import jwt from "jsonwebtoken";

const audience = "queueless-feedback-otp";
const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET;

export function createFeedbackKey(reference) {
  return jwt.sign({}, secret(), {
    algorithm: "HS256", audience, subject: reference, expiresIn: "7d",
  });
}

export function isFeedbackKeyValid(reference, key) {
  try {
    jwt.verify(key, secret(), {
      algorithms: ["HS256"], audience, subject: reference,
    });
    return true;
  } catch {
    return false;
  }
}

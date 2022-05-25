// === JWT 토큰 header 정보 설정 ===

module.exports = {
  secretKey: process.env.JWT_SECRET_KEY, // 시크릿 키
  options: {
    algorithm: "HS256", // 해싱 알고리즘
    expiresIn: "24h",  // 토큰 유효 기간
    issuer: "netapp" // 발행자
  }
}

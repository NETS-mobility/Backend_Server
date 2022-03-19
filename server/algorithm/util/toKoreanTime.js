const ToKoreanTime = (time) => {
  return (
    new Date(time.getTime() - (-540) * 60000)
      .toISOString()
      .substring(0, 19) + "+0900"
  );
};

module.exports = ToKoreanTime;

// -540 = 한국에서 time.getTimezoneOffset() 실행했을 때 반환값

const ToKoreanTime = (time) => {
  return (
    new Date(time.getTime() - time.getTimezoneOffset() * 60000)
      .toISOString()
      .substring(0, 19) + "+0900"
  );
};

module.exports = ToKoreanTime;

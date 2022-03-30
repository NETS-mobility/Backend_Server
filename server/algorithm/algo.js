const { Case1, Case2, Case3 } = require("./case");
const ToKoreanTime = require("./util/toKoreanTime");
const resultDispatch = require("./algorithm/resultDispatch");
const logger = require("../config/logger");

const Algo = async (revData) => {
  let finalDispatch1, finalDispatch2;
  let isOverPoint = 0;

  await new Promise((resolve) => setTimeout(resolve, 500));
  if (revData.gowithHospitalTime >= 120) {
    isOverPoint = 1; // 2시간 이상
  } else {
    isOverPoint = 0;
  }

  if (revData.dire == "집-집") {
    if (isOverPoint) {
      //case4의 경우, 인자를 넘겨줄 때 gowithHospitalTime을 0으로 줘야 한다.
      let dispatchResult4_1 = await Case1(revData, false);
      let dispatchResult4_2 = await Case2(revData, false);
      logger.info(dispatchResult4_1);
      logger.info(dispatchResult4_2);
      if (dispatchResult4_1 != -1 && dispatchResult4_2 != -1) {
        finalDispatch1 = await resultDispatch(
          dispatchResult4_1,
          revData,
          1,
          false
        );
        finalDispatch2 = await resultDispatch(
          dispatchResult4_2,
          revData,
          2,
          false
        );
      }
    } else {
      let dispatchResult3 = await Case3(revData);
      logger.info(dispatchResult3);
      if (dispatchResult3 != -1) {
        finalDispatch1 = await resultDispatch(
          dispatchResult3,
          revData,
          1,
          true
        );
        finalDispatch2 = await resultDispatch(
          dispatchResult3,
          revData,
          2,
          true
        );
      }
    }
  } else if (revData.dire == "집-병원") {
    let dispatchResult1 = await Case1(revData, true);
    logger.info(dispatchResult1);
    if (dispatchResult1 != -1) {
      finalDispatch1 = await resultDispatch(dispatchResult1, revData, 1, false);
      finalDispatch2 = 0;
    }
  } else if (revData.dire == "병원-집") {
    let dispatchResult2 = await Case2(revData, true);
    logger.info(dispatchResult2);
    if (dispatchResult2 != -1) {
      finalDispatch1 = await resultDispatch(dispatchResult2, revData, 2, false);
      finalDispatch2 = 0;
    }
  }

  logger.info("Done!");

  return { dispatch1: finalDispatch1, dispatch2: finalDispatch2 };
};

module.exports = Algo;

const request = require("request-promise");
const tmap = require("../../config/tmap");
const TmapTimeMachine = async (
  departureLon,
  departureLat,
  arrivalLon,
  arrivalLat,
  predictionType,
  predictionTime
) => {
  //value = "2" : 총 소요시간, 소요 거리만 확인하는 옵션

  var data = {
    routesInfo: {
      departure: {
        //출발지
        name: "test1",
        lon: departureLat,
        lat: departureLon
      },
      destination: {
        //도착지
        name: "test2",
        lon: arrivalLat,
        lat: arrivalLon
      },
      predictionType: predictionType, //출발지->도착지
      predictionTime: predictionTime, //예약 날짜, 시간
      searchOption: "01", //교통최적+무료우선 옵션 선택
    },
  };
  console.log(data);

  //예상 소요시간 계산
  let estimatedTime = 60;
  //예상 소요거리 계산
  let estimatedDistance = 60;

  //API에서 data받아오기
  await request.post({
    headers: tmap.headers,
    url: tmap.urlStr,
    body: data,
    json: true
  }, function(error, response, body) {
    console.log(response.body);
    estimatedTime = Math.round(response.body.features[0].properties.totalTime / 60); //tmap에서 계산한 시간에서 반올림(단위: 분)
    estimatedDistance = response.body.features[0].properties.totalDistance;
  });

  return {
    estimatedTime: estimatedTime,
    estimatedDistance: estimatedDistance,
  };
};

module.exports = TmapTimeMachine;

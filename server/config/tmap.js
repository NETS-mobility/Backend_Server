// === tmap 정보 ===

module.exports = {
  headers: {
    "appKey": process.env.TMAP_APP_KEY,
    "Content-Type": "application/json"
  },
  urlStr:
    "https://apis.openapi.sk.com/tmap/routes/prediction?version=1&reqCoordType=WGS84GEO&resCoordType=EPSG3857&format=json&totalValue=2"
}

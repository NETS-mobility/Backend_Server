// === 좌표 추가 모듈 ===

const logger = require("../../config/logger");
const pool2 = require("../util/mysql2");

const insertAddressCoordinate = async (addr, x, y) => {
  let result = false;
  const connection = await pool2.getConnection(async (conn) => conn);
  try {
    const sql1 = "select * from `address_coordinate` where `address`=?;";
    const sqlr1 = await connection.query(sql1, [addr]);
    if (sqlr1[0].length == 0) {
      const sql2 = "insert into `address_coordinate` values (?,?,?);";
      await connection.query(sql2, [addr, x, y]);
    }
    result = true;
  } catch (err) {
    logger.error(__filename + " : " + err);
  } finally {
    connection.release();
    return result;
  }
};

module.exports = insertAddressCoordinate;

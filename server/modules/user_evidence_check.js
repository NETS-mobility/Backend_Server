// === 필수서류 제출확인 ===
const jwt = require('./jwt');
const pool2 = require('./mysql2');

module.exports = async function (service_id) {
    let checker = false;
    const connection = await pool2.getConnection(async conn => conn);
    try {
        const spl_doc = "select `valid_target_evidence_path` as `path` from `reservation_user` where `reservation_id`=?;"
        const result_doc = await connection.query(spl_doc, [service_id]);
        const data_doc = result_doc[0];
        
        if(data_doc.length == 0) checker = false;
        else if(data_doc[0].path === null) checker = false;
        else checker = true;
    }
    catch (err) {
        console.error("err : " + err);
    }
    finally {
        connection.release();
        return checker;
    }
};

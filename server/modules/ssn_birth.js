// === 주민번호 to 생년월일 ===

module.exports = (ssn) => {
	const ssn_yearLast = ssn.substr(0, 2);
	const ssn_month = ssn.substr(2, 2);
	const ssn_date = ssn.substr(4, 2);
	const ssn_year = (ssn[7] == "1" || ssn[7] == "2") ? "19" + ssn_yearLast : "20" + ssn_yearLast;
	return ssn_year + "-" + ssn_month + "-" + ssn_date;
};

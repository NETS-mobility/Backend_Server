## Swagger
https://app.swaggerhub.com/apis/n3wzd/Backend_Server/1.0.0

https://app.swaggerhub.com/apis/YunseoKang/NETS-Backend2.0/1.0.0

https://app.swaggerhub.com/apis/NETS-mobility1/Backend_Server/1.0.0

## DB-main
2022.03.17 NETS_db_v2.22.mwb

## DB-base_setting(need to import)
2022.03.17 base_setting_v2

## Installation
package.json에 등록된 node_modules 설치
```
npm install
```

## Run
```
npm start
```

## Connect Test
### react installation
```
npm install -g create-react-app
```

### create app
프론트 앱 생성
```
npx create-react-app my-app
cd my-app
```

axios 설치
```
npm install axios
```

src/App.js 수정
```
import react from 'react';
import axios from 'axios';

function App() {

  function handleClick(e) {
      axios
      .post("http://localhost:5000/(연결할 주소)", (보낼 객체))
      .then((response) => {
        console.log(response.data);
      })
      .catch(function (error) {
        console.log("error: ", error.response.data);
      });
  }

  return (
    <div>
      <button onClick={handleClick}>test</button>
    </div>
  );
}

export default App;

```

### run
```
npm start
```
console.log 내용은 브라우저 콘솔 창에서 확인 가능
- 구글 크롬 브라우저: F12 → 콘솔 탭

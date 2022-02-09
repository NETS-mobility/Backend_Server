## Installation
package.json에 등록된 node_modules 설치
```
npm install
```

## Run
1. node 사용
```
node ./server/server.js
```
2. npm 사용
```
npm start
```

## Connect Test
### react installation
```
npm install -g create-react-app
```

### create app
```
npx create-react-app my-app
cd my-app
```

axios 설치
```
npm install axios
```

App.js 수정
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
    <form onClick={handleClick}>
      <button type="button">test</button>
    </form>
  );
}

export default App;

```

시작
```
npm start
```
console.log 내용은 브라우저 콘솔 창에서 확인 가능
- 구글 크롬 브라우저: F12 → 콘솔 탭

import { isOk } from '@servicejs/result';
import { createMockHTTP } from './src/mock.js';

const http = createMockHTTP();

http.mockRoute('https://api.example.com/users', {
  status: 200,
  body: [{ id: 1, name: 'Alice' }],
});

const result = await http.get('https://api.example.com/users');
console.log('isOk(result):', isOk(result));
console.log('result.ok:', result.ok);
console.log('result._tag:', result._tag);

if (isOk(result)) {
  console.log('Response value:', result.value);
  console.log('Calling json()...');
  const jsonResult = await result.value.json();
  console.log('JSON Result:', jsonResult);
  console.log('isOk(jsonResult):', isOk(jsonResult));
}

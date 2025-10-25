import { createMockHTTP } from './src/mock.js';

const http = createMockHTTP();

http.mockRoute('https://api.example.com/users', {
  status: 200,
  body: [{ id: 1, name: 'Alice' }],
});

const result = await http.get('https://api.example.com/users');
console.log('Result:', result);

if (result.ok) {
  const jsonResult = await result.value.json();
  console.log('JSON Result:', jsonResult);
}

async function main() {
  const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mnprince.250@gmail.com',
      password: 'test1234'
    })
  });
  console.log('Status:', res.status);
  const body = await res.json();
  console.log('Response:', JSON.stringify(body, null, 2));
}
main().catch(console.error);

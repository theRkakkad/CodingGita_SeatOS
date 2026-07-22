const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/context/AuthContext.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace localStorage token logic with csrfToken
code = code.replace(/res\.data\.token/g, 'res.data.csrfToken');
code = code.replace(/localStorage\.setItem\('token', res\.data\.csrfToken\);/g, "localStorage.setItem('csrfToken', res.data.csrfToken);");
code = code.replace(/localStorage\.removeItem\('token'\);/g, "localStorage.removeItem('csrfToken');");

// Change logout from GET to POST
code = code.replace(/api\.get\('\/api\/auth\/logout'\);/g, "api.post('/api/auth/logout');");

fs.writeFileSync(filePath, code);
console.log('AuthContext.jsx refactored successfully');

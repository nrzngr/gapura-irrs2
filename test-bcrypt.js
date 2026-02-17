const bcrypt = require('bcryptjs');

const hash = '$2b$10$jBd44PgOnUe9AEQE6I5qcefj1v0YJweJvgOaxrHymwAo1xGUrT5A2';
const password = 'Gapura123!';

bcrypt.compare(password, hash).then(res => {
    console.log('Match:', res);
});

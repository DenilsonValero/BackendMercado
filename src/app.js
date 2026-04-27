import express from 'express';
import dotenv from 'dotenv';
dotenv.config();    

const app = express();
const PORT = process.env.PORT ;
app.get('/', (req, res) => {
    res.send('servidor iniciado');
});

app.listen(PORT, () => {
    console.log('http://localhost:3000');
});

export default app;
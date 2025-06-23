// src/components/Game.js
import React from 'react';
// Se o seu componente Game precisar de outros componentes, estilos, ou hooks, importe-os aqui.
// Exemplo:
// import './Game.css'; // Se voc� tiver um arquivo CSS para o Game
// import SomeOtherComponent from './SomeOtherComponent';

function Game() {
    // Aqui � onde voc� adicionar� a l�gica do seu jogo
    // (estados, efeitos, manipula��o de eventos, etc.)

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
            <h2>Bem-vindo ao Jogo!</h2>
            <p>Este � o componente principal do seu jogo.</p>
            {/* Aqui voc� renderizar� o tabuleiro, jogadores, mensagens, etc. */}
            {/* Exemplo: */}
            {/* <SomeOtherComponent /> */}
        </div>
    );
}

export default Game; // � crucial exportar o componente como default
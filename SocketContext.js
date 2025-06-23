// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
// Importe 'io' do 'socket.io-client' se voc� estiver usando-o aqui
// import io from 'socket.io-client';

const SocketContext = createContext();

// Este � um Provider de exemplo. Seu Provider real pode ter a l�gica de conex�o com o socket.
export const SocketProvider = ({ children }) => {
    // Exemplo de estado e l�gica de socket
    const [socket, setSocket] = useState(null);

    // Voc� provavelmente ter� um useEffect para conectar ao backend aqui
    // useEffect(() => {
    //   const newSocket = io(process.env.REACT_APP_BACKEND_URL); // Use a URL do backend
    //   setSocket(newSocket);
    //   return () => newSocket.disconnect(); // Limpeza
    // }, []);

    return (
        <SocketContext.Provider value={{ socket /* adicione outros valores do contexto aqui */ }}>
            {children}
        </SocketContext.Provider>
    );
};

// Hook customizado para usar o socket
export const useSocket = () => {
    return useContext(SocketContext);
};

export default SocketContext; // Exporta o contexto tamb�m
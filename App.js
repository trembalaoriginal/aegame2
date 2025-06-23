import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css';
import Peer from 'simple-peer'; // Importa simple-peer no topo

function App() {
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [users, setUsers] = useState([]);
    const [muted, setMuted] = useState(false);
    const [roomId, setRoomId] = useState(''); // Novo estado para armazenar o ID da sala
    const localVideoRef = useRef();
    const peersRef = useRef({}); // Para armazenar objetos Peer
    const videoGridRef = useRef(); // Para o contêiner dos vídeos
    const streamRef = useRef(); // Para a stream de vídeo/áudio local
    const socketRef = useRef(); // Referência para o objeto socket

    const joinRoom = async () => {
        if (!name.trim()) { // Valida se o nome não está vazio
            alert("Por favor, digite seu nome para entrar no jogo.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            streamRef.current = stream;
            localVideoRef.current.srcObject = stream;

            // Inicializa o socket AQUI, depois de obter a stream
            // A URL do backend será alterada para a URL do Render após o deploy
            socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

            // Emite o evento 'join_room' sem um roomId fixo
            socketRef.current.emit('join_room', { username: name });
            setJoined(true);

        } catch (error) {
            console.error("Erro ao acessar câmera/microfone ou conectar ao socket:", error);
            let errorMessage = "Não foi possível acessar sua câmera/microfone ou conectar ao servidor.";
            if (error.name === "NotAllowedError") {
                errorMessage += " Verifique as permissões do navegador para câmera e microfone.";
            } else if (error.name === "NotFoundError") {
                errorMessage += " Nenhum dispositivo de mídia (câmera/microfone) encontrado.";
            }
            alert(errorMessage);
        }
    };

    useEffect(() => {
        // Só configura os listeners se o socket existir
        if (!socketRef.current) return;

        const socket = socketRef.current; // Usa a referência do socket

        socket.on('room_joined', (assignedRoomId) => {
            setRoomId(assignedRoomId); // Armazena o ID da sala atribuída
            console.log(`Você entrou na sala: ${assignedRoomId}`);
        });

        socket.on('update_users', (usersList) => {
            setUsers(usersList);
            // Lógica para adicionar/remover vídeos remotos e gerenciar peers
            updateRemoteVideos(usersList, socket.id, streamRef.current, peersRef, videoGridRef, socket);
        });

        socket.on('start_private_chat', ({ from, to, duration }) => {
            if (socket.id === from || socket.id === to) {
                alert(`Você está em conversa privada por ${duration} segundos`);
            }
        });

        socket.on('mute_user', ({ userId, duration }) => {
            if (socket.id === userId) {
                setMuted(true);
                alert(`Você foi mutado por ${duration} segundos`);
                // Desativar a trilha de áudio localmente para o usuário mutado
                if (streamRef.current) {
                    streamRef.current.getAudioTracks().forEach(track => track.enabled = false);
                    console.log("Seu áudio foi desativado.");
                }
                setTimeout(() => {
                    setMuted(false);
                    if (streamRef.current) {
                        streamRef.current.getAudioTracks().forEach(track => track.enabled = true);
                        console.log("Seu áudio foi reativado.");
                    }
                }, duration * 1000);
            }
        });

        socket.on('signal', async ({ source, signal }) => {
            if (source === socket.id) return; // Não sinalizar para si mesmo

            let peer = peersRef.current[source];
            if (!peer) {
                // Criar um novo peer se ainda não existir para este source
                peer = createPeer(source, false, streamRef.current, socket, peersRef, videoGridRef);
            }
            try {
                await peer.signal(signal);
            } catch (error) {
                console.error("Erro ao sinalizar peer:", error);
            }
        });

        // Limpeza ao desmontar o componente ou ao sair
        return () => {
            console.log("Executando limpeza do useEffect...");
            if (socketRef.current) {
                socketRef.current.disconnect();
                console.log("Socket desconectado.");
            }
            // Parar todas as tracks da stream local
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    track.stop();
                    console.log(`Track '${track.kind}' parada.`);
                });
                streamRef.current = null; // Limpa a referência da stream
            }
            // Destruir todos os objetos Peer
            for (const peerId in peersRef.current) {
                if (peersRef.current[peerId]) {
                    peersRef.current[peerId].destroy();
                    console.log(`Peer ${peerId} destruído.`);
                }
            }
            peersRef.current = {}; // Limpa o objeto de peers
            if (videoGridRef.current) {
                videoGridRef.current.innerHTML = ''; // Limpa todos os elementos de vídeo
            }
        };
    }, [joined]); // Depende de 'joined' para configurar os listeners uma vez

    // Função para criar um peer WebRTC
    const createPeer = (peerId, initiator, stream, socket, peersRef, videoGridRef) => {
        const peer = new Peer({
            initiator,
            trickle: false, // Desabilita trickle ICE para simplificar a sinalização inicial
            stream: stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('signal', {
                target: peerId,
                signal,
            });
        });

        peer.on('stream', (remoteStream) => {
            console.log(`Recebendo stream de ${peerId}`);
            // Evita adicionar o mesmo vídeo múltiplas vezes
            if (document.getElementById(`video-${peerId}`)) {
                return;
            }
            const video = document.createElement('video');
            video.id = `video-${peerId}`; // Adiciona um ID para fácil remoção
            video.srcObject = remoteStream;
            video.autoplay = true;
            video.playsInline = true;
            video.width = 200;
            video.style.transform = 'scaleX(-1)'; // Espelha a imagem para vídeos de webcam
            videoGridRef.current.appendChild(video);
        });

        peer.on('close', () => {
            console.log(`Peer ${peerId} fechado.`);
            const videoElement = document.getElementById(`video-${peerId}`);
            if (videoElement) {
                videoElement.remove(); // Remove o vídeo do DOM
            }
            if (peersRef.current[peerId]) {
                peersRef.current[peerId].destroy(); // Garante que o peer é destruído
                delete peersRef.current[peerId]; // Remove o peer da referência
            }
        });

        peer.on('error', (err) => {
            console.error(`Erro no peer ${peerId}:`, err);
            // Opcional: tentar recriar o peer ou mostrar uma mensagem de erro
        });

        peersRef.current[peerId] = peer;
        return peer;
    };

    // Função para atualizar vídeos remotos (adicionar novos, remover desconectados)
    const updateRemoteVideos = (usersList, currentSocketId, localStream, peersRef, videoGridRef, socket) => {
        const currentRemotePeers = Object.keys(peersRef.current);
        const newRemoteUserIds = usersList.filter(u => u.id !== currentSocketId).map(u => u.id);

        // Remover vídeos de usuários que se desconectaram
        currentRemotePeers.forEach(peerId => {
            if (!newRemoteUserIds.includes(peerId)) {
                console.log(`Removendo vídeo de usuário desconectado: ${peerId}`);
                const videoElement = document.getElementById(`video-${peerId}`);
                if (videoElement) {
                    videoElement.remove();
                }
                if (peersRef.current[peerId]) {
                    peersRef.current[peerId].destroy();
                    delete peersRef.current[peerId];
                }
            }
        });

        // Adicionar/criar peers para novos usuários ou usuários existentes que ainda não têm peer
        newRemoteUserIds.forEach(peerId => {
            if (!peersRef.current[peerId]) {
                console.log(`Criando peer para novo usuário: ${peerId}`);
                // O initiator deve ser true para o lado com o menor ID de socket para um par específico
                const initiator = currentSocketId < peerId;
                createPeer(peerId, initiator, localStream, socket, peersRef, videoGridRef);
            }
        });
    };


    return (
        <div className="App">
            {!joined ? (
                <div className="join-container">
                    <h1>Jogo de Vídeo</h1>
                    <input
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => { // Permite entrar com Enter
                            if (e.key === 'Enter') {
                                joinRoom();
                            }
                        }}
                    />
                    <button onClick={joinRoom}>Entrar no Jogo</button>
                </div>
            ) : (
                <div>
                    <h2>Sala: {roomId}</h2> {/* Exibe o ID da sala */}
                    <div className="video-grid" ref={videoGridRef}>
                        <video ref={localVideoRef} autoPlay muted width="200" style={{ transform: 'scaleX(-1)' }} /> {/* Seu vídeo local */}
                    </div>
                    <div className="user-list">
                        <h3>Jogadores na Sala:</h3>
                        {users.map((u) => (
                            <div key={u.id}>{u.name} {u.id === socketRef.current.id ? "(Você)" : ""}</div>
                        ))}
                    </div>
                    <div className="status">
                        {muted && <p>🔇 Você está mutado</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
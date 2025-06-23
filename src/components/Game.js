import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://aegame.onrender.com'); // 🔗 Coloque aqui sua URL do backend Render

const Game = () => {
    const [players, setPlayers] = useState([]);
    const [room, setRoom] = useState('');
    const localVideo = useRef();
    const peersRef = useRef({});
    const [name, setName] = useState('');

    useEffect(() => {
        getMedia();

        socket.on('usersInRoom', (users) => {
            setPlayers(users);
        });

        socket.on('newUser', (userId) => {
            const peer = createPeer(userId);
            peersRef.current[userId] = peer;
        });

        socket.on('signal', ({ source, signal }) => {
            const peer = peersRef.current[source];
            if (peer) {
                peer.signal(signal);
            } else {
                const newPeer = addPeer(source, signal);
                peersRef.current[source] = newPeer;
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const getMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            localVideo.current.srcObject = stream;
        } catch (err) {
            alert('Erro ao acessar câmera/microfone');
            console.error(err);
        }
    };

    const joinRoom = () => {
        if (!room) return;
        socket.emit('joinRoom', room);
    };

    const createPeer = (userId) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        const localStream = localVideo.current.srcObject;
        localStream.getTracks().forEach((track) => {
            peer.addTrack(track, localStream);
        });

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('signal', {
                    target: userId,
                    signal: { candidate: e.candidate },
                });
            }
        };

        peer.ontrack = (e) => {
            const remoteVideo = document.getElementById(userId);
            if (remoteVideo) {
                remoteVideo.srcObject = e.streams[0];
            }
        };

        peer.onnegotiationneeded = async () => {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit('signal', {
                target: userId,
                signal: { description: peer.localDescription },
            });
        };

        return peer;
    };

    const addPeer = (userId, incomingSignal) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        const localStream = localVideo.current.srcObject;
        localStream.getTracks().forEach((track) => {
            peer.addTrack(track, localStream);
        });

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('signal', {
                    target: userId,
                    signal: { candidate: e.candidate },
                });
            }
        };

        peer.ontrack = (e) => {
            const remoteVideo = document.getElementById(userId);
            if (remoteVideo) {
                remoteVideo.srcObject = e.streams[0];
            }
        };

        peer.setRemoteDescription(new RTCSessionDescription(incomingSignal.description)).then(async () => {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('signal', {
                target: userId,
                signal: { description: peer.localDescription },
            });
        });

        return peer;
    };

    return (
        <div>
            <h1>Jogo de Vídeo</h1>
            <input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                placeholder="Sala"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
            />
            <button onClick={joinRoom}>Entrar na Sala</button>

            <div>
                <h3>Você</h3>
                <video
                    ref={localVideo}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '200px' }}
                />
            </div>

            <div>
                {players.map((id) => (
                    id !== socket.id && (
                        <div key={id}>
                            <h3>{id}</h3>
                            <video
                                id={id}
                                autoPlay
                                playsInline
                                style={{ width: '200px' }}
                            />
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

export default Game;

// src/components/Game.js

import React, { useEffect, useRef, useState } from 'react';

const Game = ({ muted, onStreamReady }) => {
    const localVideoRef = useRef(null);
    const [cameraOn, setCameraOn] = useState(true);
    const [microphoneOn, setMicrophoneOn] = useState(true);
    const streamRef = useRef(null);

    useEffect(() => {
        const getMedia = async () => {
            try {
                // Tenta obter vídeo e áudio.
                // Se quiser testar APENAS com microfone, mude 'video: true' para 'video: false'.
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true, // Mudar para 'false' para desabilitar a câmera
                    audio: true,
                });
                streamRef.current = stream;

                // Anexa a stream ao elemento de vídeo local (se houver um track de vídeo)
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Garante que o estado inicial dos botões reflete o que foi obtido
                setCameraOn(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled);
                setMicrophoneOn(stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled);


                // Envia a stream para o componente pai (App.js ou GamePage.js)
                if (onStreamReady) {
                    onStreamReady(stream);
                }
            } catch (error) {
                // !!! IMPORTANTE: O alert foi removido para que você possa ver o erro no console.
                // A mensagem exata de 'error' é crucial para depuração.
                console.error("Erro ao acessar câmera/microfone:", error);
                // alert("Permita acesso à câmera e microfone para continuar."); // Comentado para depuração
            }
        };

        getMedia();

        // Função de limpeza para parar as tracks da mídia quando o componente desmontar
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, []); // O array de dependências vazio significa que este efeito roda uma vez ao montar

    useEffect(() => {
        // Atualiza o estado do microfone quando a prop 'muted' externa mudar
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !muted;
            });
            setMicrophoneOn(!muted); // Atualiza o estado interno para o botão
        }
    }, [muted]);

    const toggleCamera = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setCameraOn(videoTrack.enabled);
            } else {
                console.warn("Nenhuma faixa de vídeo encontrada. Câmera não pôde ser ligada/desligada.");
            }
        }
    };

    const toggleMicrophone = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMicrophoneOn(audioTrack.enabled);
            }
        }
    };

    return (
        <div>
            <h3>Seu vídeo</h3>
            {/* O elemento video só será exibido se houver uma stream com vídeo */}
            <video
                ref={localVideoRef}
                autoPlay
                muted // Muta seu próprio áudio localmente para evitar eco
                playsInline
                width="200"
                style={{ transform: 'scaleX(-1)', border: '2px solid #ccc' }}
            />
            <div style={{ marginTop: '10px' }}>
                <button onClick={toggleCamera}>
                    {cameraOn ? 'Desligar Câmera' : 'Ligar Câmera'}
                </button>
                <button onClick={toggleMicrophone}>
                    {microphoneOn ? 'Desligar Microfone' : 'Ligar Microfone'}
                </button>
            </div>
        </div>
    );
};

export default Game;

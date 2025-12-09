// biome-ignore lint/style/useImportType:
import React, { useState, useRef, useCallback } from 'react';

import ReactPlayer from 'react-player'
import Duration from './Duration';

export default function App() {
  const playerRef = useRef(null);

  const initialState = {
    src: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    pip: false,
    playing: true,
    controls: true,
    light: false,
    volume: 1,
    muted: false,
    played: 0,
    loaded: 0,
    duration: 0,
    playbackRate: 1.0,
    loop: false,
    seeking: false,
    loadedSeconds: 0,
    playedSeconds: 0,
  };


  const [state, setState] = useState(initialState);

  const handleRateChange = () => {
    const player = playerRef.current;
    if (!player) return;

    setState(prevState => ({ ...prevState, playbackRate: player.playbackRate }));
  };

  const handlePlay = () => {
    console.log('onPlay');
    setState(prevState => ({ ...prevState, playing: true }));
  };

  const handleEnterPictureInPicture = () => {
    console.log('onEnterPictureInPicture');
    setState(prevState => ({ ...prevState, pip: true }));
  };

  const handleLeavePictureInPicture = () => {
    console.log('onLeavePictureInPicture');
    setState(prevState => ({ ...prevState, pip: false }));
  };

  const handlePause = () => {
    console.log('onPause');
    setState(prevState => ({ ...prevState, playing: false }));
  };

  const handleProgress = () => {
    const player = playerRef.current;
    // We only want to update time slider if we are not currently seeking
    if (!player || state.seeking || !player.buffered?.length) return;

    console.log('onProgress');

    setState(prevState => ({
      ...prevState,
      loadedSeconds: player.buffered?.end(player.buffered?.length - 1),
      loaded: player.buffered?.end(player.buffered?.length - 1) / player.duration,
    }));
  };

  const handleTimeUpdate = () => {
    const player = playerRef.current;
    // We only want to update time slider if we are not currently seeking
    if (!player || state.seeking) return;

    console.log('onTimeUpdate', player.currentTime);

    if (!player.duration) return;

    setState(prevState => ({
      ...prevState,
      playedSeconds: player.currentTime,
      played: player.currentTime / player.duration,
    }));
  };

  const handleEnded = () => {
    console.log('onEnded');
    setState(prevState => ({ ...prevState, playing: prevState.loop }));
    window.location.href = "/home"
  };

  const handleDurationChange = () => {
    const player = playerRef.current;
    if (!player) return;

    console.log('onDurationChange', player.duration);
    setState(prevState => ({ ...prevState, duration: player.duration }));
  };

  const setPlayerRef = useCallback((player) => {
    if (!player) return;
    playerRef.current = player;
    console.log(player);
  }, []);

  const {
    src,
    playing,
    controls,
    light,
    volume,
    muted,
    loop,
    playbackRate,
    pip,
  } = state;

  const SEPARATOR = ' · ';

  return (
    <div className="app">
      <section className="section">
        <div className="player-wrapper">
          <ReactPlayer
            ref={setPlayerRef}
            className="react-player"
            style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
            src={src}
            pip={pip}
            playing={playing}
            controls={controls}
            light={light}
            loop={loop}
            playbackRate={playbackRate}
            volume={volume}
            muted={muted}
            config={{
              youtube: {
                color: 'white'
              },
              vimeo: {
                color: 'ffffff'
              },
              spotify: {
                preferVideo: true
              },
              tiktok: {
                fullscreen_button: true,
                progress_bar: true,
                play_button: true,
                volume_control: true,
                timestamp: false,
                music_info: false,
                description: false,
                rel: false,
                native_context_menu: true,
                closed_caption: false,
              }
            }}
            onLoadStart={() => console.log('onLoadStart')}
            onReady={() => console.log('onReady')}
            onStart={(e) => console.log('onStart', e)}
            onPlay={handlePlay}
            onEnterPictureInPicture={handleEnterPictureInPicture}
            onLeavePictureInPicture={handleLeavePictureInPicture}
            onPause={handlePause}
            onRateChange={handleRateChange}
            onSeeking={(e) => console.log('onSeeking', e)}
            onSeeked={(e) => console.log('onSeeked', e)}
            onEnded={handleEnded}
            onError={(e) => console.log('onError', e)}
            onTimeUpdate={handleTimeUpdate}
            onProgress={handleProgress}
            onDurationChange={handleDurationChange}
          />
        </div>

      </section>
    </div>
  );
};

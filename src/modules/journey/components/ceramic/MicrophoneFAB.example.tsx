/**
 * MicrophoneFAB Usage Example
 *
 * This file demonstrates how to use the MicrophoneFAB component
 * in your application.
 */

import React, { useState } from 'react';
import { MicrophoneFAB } from './MicrophoneFAB';

/**
 * Example: Basic Usage
 */
export const MicrophoneFABBasicExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);

  const handlePress = () => {
    setIsRecording(!isRecording);
    console.log(isRecording ? 'Stopping recording...' : 'Starting recording...');
  };

  return (
    <div className="min-h-screen bg-[#F0EFE9] p-8">
      <h1 className="text-2xl font-bold text-[#5C554B] mb-4">
        MicrophoneFAB Example
      </h1>
      <p className="text-[#5C554B] mb-8">
        Click the microphone button in the bottom-right corner to toggle recording.
      </p>

      <MicrophoneFAB isRecording={isRecording} onPress={handlePress} />
    </div>
  );
};

/**
 * Example: With Voice Recording Integration
 */
export const MicrophoneFABWithRecordingExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  const handlePress = async () => {
    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      console.log('Starting voice recording...');

      // TODO: Initialize your voice recording service here
      // Example:
      // await startVoiceRecording();
    } else {
      // Stop recording
      setIsRecording(false);
      console.log('Stopping voice recording...');

      // TODO: Stop recording and get transcript
      // Example:
      // const result = await stopVoiceRecording();
      // setTranscript(result.transcript);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EFE9] p-8">
      <h1 className="text-2xl font-bold text-[#5C554B] mb-4">
        Voice Recording Integration
      </h1>

      {transcript && (
        <div className="ceramic-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#5C554B] mb-2">
            Transcript:
          </h2>
          <p className="text-[#5C554B]">{transcript}</p>
        </div>
      )}

      {isRecording && (
        <div className="ceramic-card p-6 mb-8 animate-pulse">
          <p className="text-amber-600 font-semibold">
            Recording in progress...
          </p>
        </div>
      )}

      <MicrophoneFAB isRecording={isRecording} onPress={handlePress} />
    </div>
  );
};

/**
 * Example: Disabled State
 */
export const MicrophoneFABDisabledExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const handlePress = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="min-h-screen bg-[#F0EFE9] p-8">
      <h1 className="text-2xl font-bold text-[#5C554B] mb-4">
        Disabled State Example
      </h1>

      <div className="ceramic-card p-6 mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={(e) => setIsDisabled(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-[#5C554B] font-medium">Disable microphone</span>
        </label>
      </div>

      <MicrophoneFAB
        isRecording={isRecording}
        onPress={handlePress}
        disabled={isDisabled}
      />
    </div>
  );
};

export default MicrophoneFABBasicExample;

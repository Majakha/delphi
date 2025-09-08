import React, { useState, useEffect } from 'react';
import { Protocol } from './types';
import ProtocolEditor from './components/ProtocolEditor';
import './index.css';

const initialProtocol: Protocol = {
  id: 'protocol-1',
  name: 'New Dementia Study Protocol',
  type: 'in-lab',
  sections: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

function App() {
  const [protocol, setProtocol] = useState<Protocol>(() => {
    const saved = localStorage.getItem('delphi-protocol');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt)
        };
      } catch (error) {
        console.error('Error loading saved protocol:', error);
      }
    }
    return initialProtocol;
  });

  useEffect(() => {
    const protocolToSave = {
      ...protocol,
      updatedAt: new Date()
    };
    localStorage.setItem('delphi-protocol', JSON.stringify(protocolToSave));
  }, [protocol]);

  const handleProtocolChange = (updatedProtocol: Protocol) => {
    setProtocol({
      ...updatedProtocol,
      updatedAt: new Date()
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delphi Protocol Builder
              </h1>
              <p className="text-gray-600">
                Design data-gathering protocols for dementia studies
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Last updated: {protocol.updatedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8">
        <ProtocolEditor
          protocol={protocol}
          onProtocolChange={handleProtocolChange}
        />
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="text-center text-gray-500 text-sm">
            <p>
              Delphi Protocol Builder - A tool for researchers designing data-gathering protocols for dementia studies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 
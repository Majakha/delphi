import React from 'react';
import { Protocol, Section, Subsection } from '../types';

interface ProtocolOverviewProps {
  protocol: Protocol;
}

const ProtocolOverview: React.FC<ProtocolOverviewProps> = ({ protocol }) => {
  // Calculate total minutes for the protocol
  const totalMinutes = protocol.sections.reduce((total, section) => {
    const sectionTotal = section.time +
      section.subsections.reduce((subTotal, sub) =>
        subTotal + (sub.enabled !== false ? sub.time : 0), 0);
    return total + sectionTotal;
  }, 0);

  return (
    <div className="h-full overflow-y-auto bg-white rounded-lg shadow border border-gray-200 p-4 text-sm">
      <h2 className="text-lg font-bold mb-2">{protocol.name || 'Untitled Protocol'}</h2>
      <div className="text-xs text-gray-500 mb-4">
        <span className="bg-gray-100 px-2 py-0.5 rounded mr-2">{protocol.type}</span>
        <span>{totalMinutes} minutes total</span>
      </div>

      <div className="space-y-4">
        {protocol.sections.map((section, sIndex) => {
          const sectionTotal = section.time +
            section.subsections.reduce((total, sub) =>
              total + (sub.enabled !== false ? sub.time : 0), 0);

          return (
            <div key={section.id} className="border-b border-gray-200 pb-3">
              <div className="flex justify-between items-baseline">
                <h3 className="font-medium">
                  {sIndex + 1}. {section.title || 'Untitled Section'}
                </h3>
                <span className="text-xs text-gray-500">
                  {sectionTotal} min {section.time > 0 && `(max: ${section.time})`}
                </span>
              </div>

              {section.sensors && section.sensors.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Sensors: {section.sensors.length}
                </div>
              )}

              {section.additionalNotes && (
                <p className="text-xs text-gray-600 mt-1 italic">
                  {section.additionalNotes.substring(0, 100)}
                  {section.additionalNotes.length > 100 ? '...' : ''}
                </p>
              )}

              {section.subsections.length > 0 && (
                <div className="pl-4 mt-2 space-y-1">
                  {section.subsections.map((subsection, subIndex) => {
                    if (subsection.enabled === false) return null;

                    return (
                      <div key={subsection.id} className="flex justify-between items-baseline">
                        <div className="flex items-baseline">
                          <span className="text-xs text-gray-500 w-5">{subIndex + 1}.</span>
                          <span className={`${subsection.type === 'break' ? 'text-amber-600' : ''}`}>
                            {subsection.title || (subsection.type === 'break' ? 'Break' : 'Untitled Subsection')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{subsection.time} min</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {protocol.sections.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No sections added yet
        </div>
      )}
    </div>
  );
};

export default ProtocolOverview;

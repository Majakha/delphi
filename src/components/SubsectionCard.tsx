import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { X, GripVertical } from 'lucide-react';
import { Subsection } from '../types';

interface SubsectionCardProps {
  subsection: Subsection;
  index: number;
  onUpdate: (subsection: Subsection) => void;
  onDelete: (id: string) => void;
}

const SubsectionCard: React.FC<SubsectionCardProps> = ({
  subsection,
  index,
  onUpdate,
  onDelete
}) => {
  const handleChange = (field: keyof Subsection, value: string | number) => {
    onUpdate({
      ...subsection,
      [field]: value
    });
  };

  return (
    <Draggable draggableId={subsection.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`card card-hover mb-3 ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              {...provided.dragHandleProps}
              className="flex-shrink-0 mt-2 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={subsection.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="input-field"
                    placeholder="Subsection title"
                  />
                </div>
                
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time (min)
                  </label>
                  <input
                    type="number"
                    value={subsection.time}
                    onChange={(e) => handleChange('time', parseInt(e.target.value) || 0)}
                    className="input-field"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={subsection.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Add notes or comments..."
                />
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => onDelete(subsection.id)}
              className="flex-shrink-0 mt-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SubsectionCard; 
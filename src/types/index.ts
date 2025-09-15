export interface Sensor {
  id: string;
  name: string;
  category?: string;
  isCustom?: boolean;
}

export interface Subsection {
  id: string;
  title: string;
  time: number;
  rating?: number;
  description: string;
  additionalNotes: string;
  enabled: boolean;
  type: "subsection" | "break";
}

export type SubsectionItem = Subsection;

export interface Section {
  id: string;
  title: string;
  time: number;
  rating: number;
  description: string;
  additionalNotes: string;
  sensors: string[];
  subsections: SubsectionItem[];
  type: "section";
  enabled: boolean;
}

export interface Protocol {
  id: string;
  name: string;
  type: "in-lab" | "real-world";
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DragResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
}

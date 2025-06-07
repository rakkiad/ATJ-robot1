"use client"
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from "react";


type SelectedRobotContextType = {
  selectedRobot: any; 
  setSelectedRobot: Dispatch<SetStateAction<any>>;
};

const SelectedRobotContext = createContext<SelectedRobotContextType | undefined>(undefined);

export const SelectedRobotProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRobot, setSelectedRobot] = useState<any>(null); 

  return (
    <SelectedRobotContext.Provider value={{ selectedRobot, setSelectedRobot }}>
      {children}
    </SelectedRobotContext.Provider>
  );
};

export const useSelectedRobot = () => {
  const context = useContext(SelectedRobotContext);
  if (!context) throw new Error("useSelectedRobot must be used within a SelectedRobotProvider");
  return context;
};

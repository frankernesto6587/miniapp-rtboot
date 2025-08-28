export type StartPayload = {
  tema: {
    id: number;
    nombre: string;
    bancoId: number;
    banco: {
      id: number;
      nombre: string;
    };
  };
  banco: {
    id: number;
    nombre: string;
  };
  grupo: {
    id: string;
    nombre: string;
    resellerId: string;
    idTemaResumen: number;
    resumen: number;
    idTemaFinanciamiento: number;
    active: boolean;
    idTemaSendError: number | null;
    idTemaSendSMS: number | null;
    idTemaSendCall: number | null;
  };
  user: {
    id: string;
    nombre: string;
    rol: string;
    activo: boolean;
    parent: {
      id: string;
      nombre: string;
      rol: string;
      activo: boolean;
    };
  };
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { start_param?: string };
  ready(): void; 
  expand(): void; 
  close(): void;
  showAlert(message: string, callback?: () => void): void;
};

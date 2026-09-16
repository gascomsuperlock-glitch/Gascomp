export type ServiceCenter = {
  id: string;
  name: string;
  provinceCode: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  mapsUrl: string;
  latitude: number;
  longitude: number;
  active: boolean;
};

export type ServiceCenterInput = Omit<ServiceCenter, "id"> & { id?: string };

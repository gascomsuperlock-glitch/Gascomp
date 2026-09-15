export type CareMember = {
  id: string;
  memberNumber: string;
  name: string;
  username: string;
  whatsapp: string;
  orderReference: string;
  createdAt: string;
  mustChangePassword: boolean;
};

export type CareActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  credentials?: { username: string; password: string };
  member?: CareMember;
};

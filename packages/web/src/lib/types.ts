export interface ApiParam {
  name: string;
  desc: string;
  example?: string;
  required?: boolean;
  options?: string[];
  type?: 'text' | 'number' | 'textarea' | 'select' | 'image' | 'file' | 'audio' | 'video';
}

export interface EndpointItem {
  name: string;
  desc: string;
  category: string;
  path: string;
  methods: string[];
  params?: ApiParam[];
}

export interface EndpointBucket {
  name: string;
  items: EndpointItem[];
}

export interface AquaConfig {
  status: boolean;
  name: string;
  description: string;
  operator: string;
  icon: string;
  telegram?: string;
  messenger?: string;
  github?: string;
  header: {
    status: string;
    imageSrc: string[];
    imageSize: { mobile: string; tablet: string; desktop: string };
  };
  notification: NotificationItem[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  createdAt: number;
}

import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            activeOrgId?: string;
            orgs?: Array<{ id: string; name: string; role: string }>;
        } & DefaultSession['user'];
    }

    interface User {
        id: string;
        email: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        email: string;
        activeOrgId?: string;
        orgs?: Array<{ id: string; name: string; role: string }>;
    }
}
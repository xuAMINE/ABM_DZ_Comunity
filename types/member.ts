// types/member.ts
export interface MemberProfile {
    uid: string;
    fullName: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    photoURL?: string | null;
    groupId?: string;
    role?: string;
    status?: string;
}

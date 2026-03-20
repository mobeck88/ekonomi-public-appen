// src/lib/server/access.ts

type Locals = {
    user: { id: string } | null;
    householdId: string | null;
    supabase: any;
};

export async function getAccessContext(locals: Locals, url: URL) {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) {
        return {
            allowed: false,
            reason: 'not_logged_in' as const
        };
    }

    if (!householdId) {
        return {
            allowed: false,
            reason: 'no_household' as const
        };
    }

    const { data: membership } = await supabase
        .from('household_members')
        .select('id, role, guardian_for, user_id')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .maybeSingle();

    const role = membership?.role ?? null;
    const isOwner = role === 'owner';
    const isGuardian = role === 'guardian';
    const isMember = role === 'member';

    let guardianForMemberId: string | null = null;
    let guardianForUserId: string | null = null;

    if (isGuardian && membership?.guardian_for) {
        const { data: target } = await supabase
            .from('household_members')
            .select('id, user_id')
            .eq('id', membership.guardian_for)
            .eq('household_id', householdId)
            .maybeSingle();

        if (target) {
            guardianForMemberId = target.id;
            guardianForUserId = target.user_id;
        }
    }

    const { data: members } = await supabase
        .from('household_members')
        .select('id, user_id, role, guardian_for, profiles(full_name)')
        .eq('household_id', householdId);

    const userIdParam = url.searchParams.get('user_id');
    let selectedUserId = user.id;

    if (isOwner) {
        if (userIdParam) {
            const match = members?.find((m: any) => m.user_id === userIdParam);
            selectedUserId = match ? userIdParam : user.id;
        }
    } else if (isGuardian) {
        selectedUserId = guardianForUserId ?? user.id;
    } else {
        selectedUserId = user.id;
    }

    let selectableMembers: any[] = [];

    if (isOwner) {
        selectableMembers = members ?? [];
    } else if (isGuardian && guardianForMemberId) {
        selectableMembers = (members ?? []).filter((m: any) => m.id === guardianForMemberId);
    } else {
        selectableMembers = [];
    }

    const canEdit =
        isOwner ||
        (isGuardian && selectedUserId === guardianForUserId) ||
        (isMember && selectedUserId === user.id);

    return {
        allowed: true as const,
        role,
        isOwner,
        isGuardian,
        isMember,
        membership,
        members: members ?? [],
        selectableMembers,
        selectedUserId,
        currentUserId: user.id,
        guardianForMemberId,
        guardianForUserId,
        canEdit
    };
}

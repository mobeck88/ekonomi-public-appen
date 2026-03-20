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
        return { allowed: false, reason: 'not_logged_in' as const };
    }

    if (!householdId) {
        return { allowed: false, reason: 'no_household' as const };
    }

    // Hämta medlemskap
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

    // Hämta alla medlemmar
    const { data: members } = await supabase
        .from('household_members')
        .select('id, user_id, role, guardian_for, profiles(full_name)')
        .eq('household_id', householdId);

    const userIdParam = url.searchParams.get('user_id');
    let selectedUserId = user.id;

    // OWNER: får hantera alla UTOM guardians
    if (isOwner) {
        if (userIdParam) {
            const match = members?.find(
                (m: any) => m.user_id === userIdParam && m.role !== 'guardian'
            );
            selectedUserId = match ? userIdParam : user.id;
        }
    }

    // GUARDIAN: får hantera alla med guardian_for = true
    else if (isGuardian) {
        const allowedTargets = (members ?? []).filter(
            (m: any) => m.guardian_for === true
        );

        if (userIdParam) {
            const match = allowedTargets.find((m: any) => m.user_id === userIdParam);
            selectedUserId = match ? userIdParam : allowedTargets[0]?.user_id ?? user.id;
        } else {
            selectedUserId = allowedTargets[0]?.user_id ?? user.id;
        }
    }

    // MEMBER: får bara hantera sig själv
    else if (isMember) {
        selectedUserId = user.id;
    }

    // Dropdown‑val
    let selectableMembers: any[] = [];

    if (isOwner) {
        selectableMembers = (members ?? []).filter((m: any) => m.role !== 'guardian');
    } else if (isGuardian) {
        selectableMembers = (members ?? []).filter((m: any) => m.guardian_for === true);
    } else {
        selectableMembers = [];
    }

    // Redigeringsrättigheter
    const canEdit =
        isOwner ||
        (isGuardian &&
            selectableMembers.some((m: any) => m.user_id === selectedUserId)) ||
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
        canEdit
    };
}

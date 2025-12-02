import React, { useState } from 'react';
import { Plus, X, User, Phone } from 'lucide-react';
import { TeamMember } from '../types';
import { supabase } from '../supabaseClient';

interface TeamMemberFormProps {
    episodeId: string;
    members: TeamMember[];
    onMembersChange: (members: TeamMember[]) => void;
}

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
    episodeId,
    members = [],
    onMembersChange
}) => {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [role, setRole] = useState<'host' | 'guest' | 'producer' | 'tech'>('guest');
    const [whatsapp, setWhatsapp] = useState('');
    const [saving, setSaving] = useState(false);

    const formatWhatsApp = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');

        // Format: +55 11 99999-9999
        if (digits.length <= 2) return `+${digits}`;
        if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
        return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
    };

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatWhatsApp(e.target.value);
        setWhatsapp(formatted);
    };

    const validateForm = () => {
        if (!name.trim()) return false;
        if (whatsapp && whatsapp.replace(/\D/g, '').length < 12) return false; // At least +55 11 99999999
        return true;
    };

    const handleAddMember = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('podcast_team_members')
                .insert({
                    episode_id: episodeId,
                    name: name.trim(),
                    role,
                    whatsapp: whatsapp || null
                })
                .select()
                .single();

            if (error) throw error;

            onMembersChange([...members, data]);

            // Reset form
            setName('');
            setWhatsapp('');
            setRole('guest');
            setShowForm(false);
        } catch (error) {
            console.error('Error adding team member:', error);
            alert('Erro ao adicionar membro da equipe');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from('podcast_team_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            onMembersChange(members.filter(m => m.id !== memberId));
        } catch (error) {
            console.error('Error removing team member:', error);
            alert('Erro ao remover membro');
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'host': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'guest': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'producer': return 'bg-green-100 text-green-700 border-green-200';
            case 'tech': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'host': return 'Host';
            case 'guest': return 'Convidado';
            case 'producer': return 'Produtor';
            case 'tech': return 'Técnico';
            default: return role;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#5C554B]">Equipe & Participantes</h3>
                <span className="text-xs text-[#948D82]">Para identificação de oradores pela IA</span>
            </div>

            {/* Member Chips */}
            <div className="flex flex-wrap gap-2">
                {members.map(member => (
                    <div
                        key={member.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getRoleColor(member.role)} transition-all hover:scale-105`}
                    >
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold">
                            {member.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name */}
                        <span className="text-xs font-medium">{member.name}</span>

                        {/* Role Badge */}
                        <span className="text-[10px] opacity-70">{getRoleLabel(member.role)}</span>

                        {/* Remove Button */}
                        <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                {/* Add Button Chip */}
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-[#5C554B]/30 text-[#5C554B] hover:bg-[#5C554B]/5 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-medium">Adicionar</span>
                </button>
            </div>

            {/* Add Member Form */}
            {showForm && (
                <div className="p-4 rounded-xl shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] space-y-3">
                    {/* Name Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#5C554B]">Nome</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-[#5C554B]" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Ana Lara"
                                className="w-full pl-10 pr-3 py-2 rounded-lg shadow-[inset_3px_3px_6px_rgba(163,158,145,0.2),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] bg-[#F0EFE9] border-none outline-none focus:shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1)] text-sm text-[#5C554B]"
                            />
                        </div>
                    </div>

                    {/* Role Select */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#5C554B]">Papel</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg shadow-[inset_3px_3px_6px_rgba(163,158,145,0.2),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] bg-[#F0EFE9] border-none outline-none focus:shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1)] text-sm text-[#5C554B]"
                        >
                            <option value="host">Host</option>
                            <option value="guest">Convidado</option>
                            <option value="producer">Produtor</option>
                            <option value="tech">Técnico</option>
                        </select>
                    </div>

                    {/* WhatsApp Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#5C554B]">WhatsApp (opcional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="h-4 w-4 text-[#5C554B]" />
                            </div>
                            <input
                                type="tel"
                                value={whatsapp}
                                onChange={handleWhatsAppChange}
                                placeholder="+55 11 99999-9999"
                                className="w-full pl-10 pr-3 py-2 rounded-lg shadow-[inset_3px_3px_6px_rgba(163,158,145,0.2),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] bg-[#F0EFE9] border-none outline-none focus:shadow-[inset_4px_4px_8px_rgba(163,158,145,0.25),inset_-4px_-4px_8px_rgba(255,255,255,1)] text-sm text-[#5C554B]"
                            />
                        </div>
                        <p className="text-[10px] text-[#948D82]">Para identificação de áudio pela IA</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddMember}
                            disabled={!validateForm() || saving}
                            className="flex-1 px-4 py-2 bg-[#F0EFE9] hover:bg-[#EBE9E4] text-[#5C554B] text-sm font-medium rounded-lg transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,1.0)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Salvando...' : 'Adicionar'}
                        </button>
                        <button
                            onClick={() => {
                                setShowForm(false);
                                setName('');
                                setWhatsapp('');
                                setRole('guest');
                            }}
                            className="px-4 py-2 text-[#5C554B] text-sm font-medium rounded-lg transition-colors hover:bg-[#5C554B]/5"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

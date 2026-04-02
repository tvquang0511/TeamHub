-- AlterTable
ALTER TABLE "workspace_invites" ADD COLUMN     "role" "workspace_member_role" NOT NULL DEFAULT 'MEMBER';

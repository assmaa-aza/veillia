from fastapi import HTTPException, status

from app.schemas.user import ProfileResponse, ProfileUpdate


class ProfileService:
    """
    Reads and writes the `profiles` table using a Supabase client that's
    already scoped to the requesting user (see get_supabase_for_user), so
    Row Level Security applies exactly as it would for a direct client call.
    """

    @staticmethod
    def get_profile(supabase, user_id: str) -> ProfileResponse:
        response = (
            supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in VeillIA system.",
            )

        return ProfileResponse(**response.data)

    @staticmethod
    def update_profile(supabase, user_id: str, payload: ProfileUpdate) -> ProfileResponse:
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided",
            )

        response = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile",
            )

        return ProfileResponse(**response.data[0])


profile_service = ProfileService()

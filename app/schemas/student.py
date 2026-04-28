from pydantic import BaseModel


class StudentCreate(BaseModel):
    dataset_id: int
    code_module: str
    code_presentation: str
    gender: str
    region: str
    highest_education: str
    imd_band: str
    age_band: str
    num_of_prev_attempts: int
    studied_credits: int
    disability: str


class StudentUpdate(BaseModel):
    dataset_id: int | None = None
    code_module: str | None = None
    code_presentation: str | None = None
    gender: str | None = None
    region: str | None = None
    highest_education: str | None = None
    imd_band: str | None = None
    age_band: str | None = None
    num_of_prev_attempts: int | None = None
    studied_credits: int | None = None
    disability: str | None = None

class StudentResponse(BaseModel):
    student_id: int
    dataset_id: int
    code_module: str
    code_presentation: str
    gender: str
    region: str
    highest_education: str
    imd_band: str
    age_band: str
    num_of_prev_attempts: int
    studied_credits: int
    disability: str


    class Config:
        from_attributes = True
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
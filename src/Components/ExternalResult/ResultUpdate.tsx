import React, { useCallback, useState, useReducer } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  InputLabel,
  Radio,
  RadioGroup,
} from "@material-ui/core";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import { navigate, useQueryParams } from "raviger";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import moment from "moment";
import loadable from "@loadable/component";
import * as Notification from "../../Utils/Notifications.js";
import { useDispatch } from "react-redux";
import DuplicatePatientDialog from "../Facility/DuplicatePatientDialog";
import { DupPatientModel } from "../Facility/models";
// import { PatientModel } from "./models";
import TransferPatientDialog from "../Facility/TransferPatientDialog";
import { validatePincode } from "../../Common/validation";
import { statusType, useAbortableEffect } from "../../Common/utils";
import {
  createPatient,
  getDistrictByState,
  getLocalbodyByDistrict,
  getPatient,
  getStates,
  searchPatient,
  updatePatient,
  getWardByLocalBody,
  externalResult,
  partialUpdateExternalResult,
} from "../../Redux/actions";
import {
  AutoCompleteMultiField,
  CheckboxField,
  DateInputField,
  MultilineInputField,
  PhoneNumberField,
  SelectField,
  TextInputField,
} from "../Common/HelperInputFields";
import { CompassCalibrationOutlined } from "@material-ui/icons";

const Loading = loadable(() => import("../Common/Loading"));
const PageTitle = loadable(() => import("../Common/PageTitle"));
const debounce = require("lodash.debounce");

const initForm: any = {
  name: "",
  phone_number: "",
  address: "",
  state: "",
  district: "",
  local_body: "",
  ward: "",
  local_body_type: "",
};

const initError = Object.assign(
  {},
  ...Object.keys(initForm).map((k) => ({ [k]: "" }))
);

const initialState = {
  form: { ...initForm },
  errors: { ...initError },
};

const FormReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case "set_form": {
      return {
        ...state,
        form: action.form,
      };
    }
    case "set_error": {
      return {
        ...state,
        errors: action.errors,
      };
    }
    default:
      return state;
  }
};
const initialStates = [{ id: 0, name: "Choose State *" }];
const initialDistricts = [{ id: 0, name: "Choose District" }];
const selectStates = [{ id: 0, name: "Please select your state" }];
const initialLocalbodies = [{ id: 0, name: "Choose Localbody", number: 0 }];
const initialWard = [{ id: 0, name: "Choose Ward", number: 0 }];
const selectDistrict = [{ id: 0, name: "Please select your district" }];

export default function UpdateResult(props: any) {
  const { id } = props;

  const dispatchAction: any = useDispatch();
  const [state, dispatch] = useReducer(FormReducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistrictLoading, setIsDistrictLoading] = useState(false);
  const [isLocalbodyLoading, setIsLocalbodyLoading] = useState(false);
  const [isWardLoading, setIsWardLoading] = useState(false);
  const [states, setStates] = useState(initialStates);
  const [districts, setDistricts] = useState(selectStates);
  const [localBody, setLocalBody] = useState(selectDistrict);
  const [ward, setWard] = useState(initialLocalbodies);
  const [data, setData] = useState(initForm);

  const fetchData = useCallback(
    async (status: statusType) => {
      setIsLoading(true);
      const res = await dispatchAction(externalResult({ id: id }));
      if (!status.aborted) {
        if (res && res.data) {
          console.log(res.data);
          const form = { ...state.form };
          form["name"] = res.data.name;
          form["phone_number"] = res.data.mobile_number;
          form["address"] = res.data.address;
          form["state"] = res.data.district_object.state;
          form["district"] = res.data.district_object.name;
          form["local_body"] = String(res.data.local_body);
          form["ward"] = String(res.data.ward);
          form["local_body_type"] = res.data.local_body_type;

          dispatch({ type: "set_form", form });

          Promise.all([
            fetchLocalBody(res.data.district),
            fetchWards(res.data.local_body),
          ]);
        }
        setIsLoading(false);
      }
    },
    [props.id, dispatchAction]
  );

  // const fetchDistricts = useCallback(
  //   async (id: string) => {
  //     if (Number(id) > 0) {
  //       setIsDistrictLoading(true);
  //       const districtList = await dispatchAction(getDistrictByState({ id }));
  //       setDistricts([...initialDistricts, ...districtList.data]);
  //       setIsDistrictLoading(false);
  //     } else {
  //       setDistricts(selectStates);
  //     }
  //   },
  //   [dispatchAction]
  // );

  const fetchLocalBody = useCallback(
    async (id: string) => {
      if (Number(id) > 0) {
        setIsLocalbodyLoading(true);
        const localBodyList = await dispatchAction(
          getLocalbodyByDistrict({ id })
        );
        setIsLocalbodyLoading(false);
        setLocalBody([...initialLocalbodies, ...localBodyList.data]);
      } else {
        setLocalBody(selectDistrict);
      }
    },
    [dispatchAction]
  );

  const fetchWards = useCallback(
    async (id: string) => {
      if (Number(id) > 0) {
        setIsWardLoading(true);
        const wardList = await dispatchAction(getWardByLocalBody({ id }));
        setIsWardLoading(false);
        setWard([...initialWard, ...wardList.data.results]);
      } else {
        setWard(initialLocalbodies);
      }
    },
    [dispatchAction]
  );

  useAbortableEffect(
    (status: statusType) => {
      fetchData(status);
    },
    [fetchData]
  );

  const validateForm = () => {
    let errors = { ...initError };
    let invalidForm = false;
    console.log("fields", state.form);
    Object.keys(state.form).forEach((field, i) => {
      console.log("field", field);
      switch (field) {
        case "address":
          if (!state.form[field]) {
            errors[field] = "Field is required";
            invalidForm = true;
          }
          return;
        case "local_body":
          if (!state.form[field] || state.form[field] === "0") {
            errors[field] = "Please select local body";
            console.log("yes");
            invalidForm = true;
          }
          console.log("l", invalidForm);
          return;
        case "ward":
          if (!state.form[field] || state.form[field] === "0") {
            errors[field] = "Please select ward";
            invalidForm = true;
          }
          return;
        case "local_body_type":
          if (!state.form[field] || !state.form[field].length) {
            errors[field] = "Please select local body type";
            invalidForm = true;
          }
          return;
        default:
          return;
      }
    });
    if (invalidForm) {
      dispatch({ type: "set_error", errors });
      return false;
    }
    dispatch({ type: "set_error", errors });
    return true;
  };

  const handleChange = (e: any) => {
    const form = { ...state.form };
    form[e.target.name] = e.target.value;
    dispatch({ type: "set_form", form });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const validForm = validateForm();
    console.log(validForm, state.form.local_body);
    if (validForm) {
      setIsLoading(true);
      const data = {
        address: state.form.address ? state.form.address : undefined,
        state: state.form.state ? state.form.state : undefined,
        district: state.form.district ? state.form.district : undefined,
        local_body: state.form.local_body ? state.form.local_body : undefined,
        ward: state.form.ward,
        local_body_type: Number(state.form.local_body_type),
      };

      const res = await dispatchAction(partialUpdateExternalResult(id, data));
      setIsLoading(false);
      if (res && res.data && res.status != 400) {
        dispatch({ type: "set_form", form: initForm });
        Notification.Success({
          msg: "Patient updated successfully",
        });
      }
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <PageTitle title="Update External Result" className="px-6 mb-2" />
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e)}>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div data-testid="name">
              <InputLabel id="name-label">Name</InputLabel>
              <TextInputField
                name="name"
                variant="outlined"
                margin="dense"
                type="text"
                value={state.form.name}
                onChange={handleChange}
                errors={state.errors.name}
                disabled={true}
              />
            </div>
            <div data-testid="name">
              <InputLabel id="name-label">Phone Number</InputLabel>
              <TextInputField
                name="phone_number"
                variant="outlined"
                margin="dense"
                type="text"
                value={state.form.phone_number}
                onChange={handleChange}
                errors={state.errors.phone_number}
                disabled={true}
              />
            </div>
            <div data-testid="current-address">
              <InputLabel id="address-label">Current Address*</InputLabel>
              <MultilineInputField
                rows={2}
                name="address"
                variant="outlined"
                margin="dense"
                type="text"
                placeholder="Enter the current address"
                value={state.form.address}
                onChange={handleChange}
                errors={state.errors.address}
              />
            </div>
            <div data-testid="localbody">
              <InputLabel id="local_body-label">Localbody*</InputLabel>
              {isLocalbodyLoading ? (
                <CircularProgress size={20} />
              ) : (
                <SelectField
                  name="local_body"
                  variant="outlined"
                  margin="dense"
                  value={state.form.local_body}
                  options={localBody}
                  optionValue="name"
                  onChange={(e) => [
                    handleChange(e),
                    fetchWards(String(e.target.value)),
                  ]}
                  errors={state.errors.local_body}
                />
              )}
            </div>
            <div data-testid="ward-respective-lsgi">
              <InputLabel id="ward-label">
                Ward/Division of respective LSGI*
              </InputLabel>
              {isWardLoading ? (
                <CircularProgress size={20} />
              ) : (
                <SelectField
                  name="ward"
                  variant="outlined"
                  margin="dense"
                  options={ward
                    .sort((a, b) => a.number - b.number)
                    .map((e) => {
                      return { id: e.id, name: e.number + ": " + e.name };
                    })}
                  value={state.form.ward}
                  optionValue="name"
                  onChange={handleChange}
                  errors={state.errors.ward}
                />
              )}
              {console.log(
                ward
                  .sort((a, b) => a.number - b.number)
                  .map((e) => {
                    return { id: e.id, name: e.number + ": " + e.name };
                  })
              )}
            </div>
            <div data-testid="current-address">
              <InputLabel id="address-label">Local Body Type*</InputLabel>
              <MultilineInputField
                rows={2}
                name="local_body_type"
                variant="outlined"
                margin="dense"
                type="text"
                placeholder="Enter the current address"
                value={state.form.local_body_type}
                onChange={handleChange}
                errors={state.errors.address}
              />
            </div>
          </div>
          <div className="flex justify-between mt-4">
            {/* <Button
            color="default"
            variant="contained"
            type="button"
            onClick={goBack}
          >
            {" "}
            Cancel{" "}
          </Button> */}
            {console.log("form", state.form)}
            <Button
              color="primary"
              variant="contained"
              type="submit"
              style={{ marginLeft: "auto" }}
              startIcon={<CheckCircleOutlineIcon>save</CheckCircleOutlineIcon>}
              onClick={(e) => handleSubmit(e)}
              data-testid="submit-button"
            >
              {" "}
              Submit{" "}
            </Button>
          </div>
        </form>
      </CardContent>
    </div>
  );
}

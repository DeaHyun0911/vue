import { computed, inject } from 'vue';

export function useFormField(props, emit) {
    const formModel = inject('formModel', null);

    const innerValue = computed({
        get() {
            // If 'field' prop is provided and we are inside a CtvForm (providing formModel),
            // we use the implicit binding.
            if (props.field && formModel && formModel.value && formModel.value[props.field] !== undefined) {
                return formModel.value[props.field];
            }
            // Fallback to v-model
            return props.modelValue;
        },
        set(val) {
            if (props.field && formModel && formModel.value) {
                formModel.value[props.field] = val;
            }
            emit('update:modelValue', val);
        }
    });

    return {
        innerValue
    };
}

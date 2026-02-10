/**
 * 컴포넌트 레지스트리
 * 컴포넌트 간 통신을 위한 전역 레지스트리
 */
class ComponentRegistry {
    constructor() {
        this.components = new Map();
    }

    /**
     * 컴포넌트 등록
     * @param {string} id - 컴포넌트 고유 ID
     * @param {object} component - 컴포넌트 인스턴스 정보
     */
    register(id, component) {
        this.components.set(id, component);
    }

    /**
     * 컴포넌트 등록 해제
     * @param {string} id - 컴포넌트 고유 ID
     */
    unregister(id) {
        this.components.delete(id);
    }

    /**
     * ID로 컴포넌트 가져오기
     * @param {string} id - 컴포넌트 고유 ID
     * @returns {object|undefined} 컴포넌트 인스턴스
     */
    get(id) {
        return this.components.get(id);
    }

    /**
     * 그룹으로 컴포넌트 목록 가져오기
     * @param {string} group - 그룹 ID
     * @returns {array} 컴포넌트 인스턴스 배열
     */
    getByGroup(group) {
        const components = [];
        this.components.forEach((component, id) => {
            if (component.group === group) {
                components.push(component);
            }
        });
        return components;
    }

    /**
     * 모든 컴포넌트 가져오기
     * @returns {Map} 전체 컴포넌트 맵
     */
    getAll() {
        return this.components;
    }

    /**
     * 레지스트리 초기화
     */
    clear() {
        this.components.clear();
    }
}

// 싱글톤 인스턴스 생성
const componentRegistry = new ComponentRegistry();

export default componentRegistry;
